# Audit Agent Telemetry Integration (`__init__.py`)

This documentation outlines the exact code additions made in `agents/modes/guided/__init__.py` to stream live telemetry to Upstash Redis for the Audit Dashboard. The changes are listed in the exact top-to-bottom order as they appear in the file, explicitly noting exactly *where* (which function or scope) each piece of code belongs.

## Environment Variables
Before modifying the code, ensure the following keys are added to your `.env` file so the agent can authenticate with Redis over HTTP:
```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

---

## 1. Header Files (Imports)
**Location:** At the very top of the file, outside of any functions.

```python
import json
import urllib.request
```

## 2. Redis Connection (Helpers)
**Location:** At the top level of the file (after the imports and before the `run` function). 

These helpers interact with Upstash Redis using the native `urllib.request` library.

```python
# -- Upstash Redis REST helpers (NON-BLOCKING via asyncio threads) --
import os as _os
import asyncio

_UPSTASH_URL = _os.getenv("UPSTASH_REDIS_REST_URL", "").rstrip("/")
_UPSTASH_TOKEN = _os.getenv("UPSTASH_REDIS_REST_TOKEN", "")


def _redis_rpush(key, value):
    if not _UPSTASH_URL or not _UPSTASH_TOKEN:
        return

    def _do_push():
        try:
            body = json.dumps([["RPUSH", key, json.dumps(value)]]).encode("utf-8")
            req = urllib.request.Request(
                f"{_UPSTASH_URL}/pipeline",
                data=body,
                headers={"Authorization": f"Bearer {_UPSTASH_TOKEN}", "Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=3.0)
        except Exception as _e:
            logger.debug("[REDIS] RPUSH failed for key %s: %s", key, _e)

    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, _do_push)
    except RuntimeError:
        _do_push()


def _redis_expire(key, seconds=86400):
    if not _UPSTASH_URL or not _UPSTASH_TOKEN:
        return

    def _do_expire():
        try:
            body = json.dumps([["EXPIRE", key, seconds]]).encode("utf-8")
            req = urllib.request.Request(
                f"{_UPSTASH_URL}/pipeline",
                data=body,
                headers={"Authorization": f"Bearer {_UPSTASH_TOKEN}", "Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=3.0)
        except Exception as _e:
            logger.debug("[REDIS] EXPIRE failed for key %s: %s", key, _e)

    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, _do_expire)
    except RuntimeError:
        _do_expire()
```

---

*Note: ALL of the following code blocks (sections 3 through 8) MUST be placed **INSIDE** the main `run` function.* 
```python
async def run(ctx: JobContext, spec: SessionSpec) -> None:
    # (Place the following blocks inside this function)
```

## 3. Session State Trackers
**Location:** Inside the `async def run(ctx: JobContext, spec: SessionSpec) -> None:` function (place this near the top of the function, before setting up the `AgentSession`).

```python
    _turn_index = [0]
    _session_start_time = time.time()
    _barge_ins = [0]
    _post_sent = [False]  # Guard: prevent double POST on participant_disconnected
    
    # Captures agent speech START time when user enters LISTENING (= agent just started speaking).
    # This correctly places the agent turn BEFORE any subsequent user barge-in.
    _agent_speech_start_ts = [None]
```

## 4. Barge-In Detection
**Location:** Inside the `async def run(ctx: JobContext, spec: SessionSpec) -> None:` function.

```python
    # --- BARGE-IN / INTERRUPTION TRACKING ---
    @session.on("user_state_changed")
    def on_user_state_changed(ev):
        # When user transitions to LISTENING, the agent just started speaking - capture that moment.
        if ev.new_state == "listening":
            _agent_speech_start_ts[0] = round(time.time() * 1000)
        if ev.new_state == "speaking" and getattr(session, "agent_state", None) == "speaking":
            _barge_ins[0] += 1
            _pending_turn["barge_in"] = True
            logger.info(f"Detected barge-in/interruption. Total: {_barge_ins[0]}")
```

## 5. STT, LLM, TTS Datas (Turn Metrics)
**Location:** Inside the `async def run(ctx: JobContext, spec: SessionSpec) -> None:` function.

```python
    # --- TURN-BY-TURN METRICS ---
    _stt_ms, _llm_ms, _tts_ms = [], [], []
    _pending_turn = {}

    # Intercept LiveKit's internal log to capture STT transcript_delay.
    # This is the only reliable way to get STT latency in livekit-agents >= 1.5.
    class _STTDelayFilter(logging.Filter):
        def filter(self, record):
            if record.getMessage() == "received user transcript":
                delay = getattr(record, "transcript_delay", None)
                if delay is not None and delay > 0:
                    ms = round(delay * 1000)
                    _stt_ms.append(ms)
                    _pending_turn["stt_ms"] = ms
                    _pending_turn["timestamp_ms"] = round(time.time() * 1000)
                    logger.info(f"Captured STT delay from LiveKit log: {ms}ms")
            return True

    logging.getLogger("livekit.agents").addFilter(_STTDelayFilter())

    @session.on("metrics_collected")
    def on_metrics(ev):
        m = getattr(ev, "metrics", ev)
        try:
            from livekit.agents import metrics as _m
            ts = round(time.time() * 1000)

            if isinstance(m, _m.STTMetrics):
                pass  # STT latency captured via _STTDelayFilter above

            elif isinstance(m, _m.LLMMetrics):
                ttft = getattr(m, "ttft", None)
                prompt_tokens = getattr(m, "prompt_tokens", None)
                completion_tokens = getattr(m, "completion_tokens", None)
                if ttft:
                    ms = round(ttft * 1000)
                    _llm_ms.append(ms)
                    _pending_turn["llm_ttft_ms"] = ms
                    _pending_turn["timestamp_ms"] = _pending_turn.get("timestamp_ms", ts)
                if prompt_tokens is not None:
                    _pending_turn["prompt_tokens"] = prompt_tokens
                if completion_tokens is not None:
                    _pending_turn["completion_tokens"] = completion_tokens

            elif isinstance(m, _m.TTSMetrics):
                ttfb = getattr(m, "ttfb", None)
                if ttfb:
                    ms = round(ttfb * 1000)
                    _tts_ms.append(ms)
                    _pending_turn["tts_ttfb_ms"] = ms
                    _pending_turn["timestamp_ms"] = _pending_turn.get("timestamp_ms", ts)

        except Exception as _e:
            logger.debug(f"on_metrics error: {_e}")

    @session.on("agent_state_changed")
    def on_agent_state_changed(agent_state):
        import time
        state_str = str(agent_state).lower()
        if "listening" in state_str:
            if _pending_turn and _pending_turn.get("tts_ttfb_ms"):
                _turn_index[0] += 1
                record = {
                    "turn_index": _turn_index[0],
                    "timestamp_ms": _pending_turn.get("timestamp_ms", round(time.time() * 1000)),
                    "stt_ms": _pending_turn.get("stt_ms"),
                    "llm_ttft_ms": _pending_turn.get("llm_ttft_ms"),
                    "tts_ttfb_ms": _pending_turn.get("tts_ttfb_ms"),
                    "prompt_tokens": _pending_turn.get("prompt_tokens"),
                    "completion_tokens": _pending_turn.get("completion_tokens"),
                    "barge_in": _pending_turn.get("barge_in", False),
                }
                _rsid = ctx.room.name.replace("interview-", "", 1)
                _redis_rpush(f"session:{_rsid}:turns", record)
                _redis_expire(f"session:{_rsid}:turns")
                logger.info(
                    "[TURN %d] STT=%sms LLM=%sms TTS=%sms BargeIn=%s | pushed to Redis",
                    record["turn_index"],
                    record.get("stt_ms"), record.get("llm_ttft_ms"), record.get("tts_ttfb_ms"), record.get("barge_in")
                )
                _pending_turn.clear()
```

## 6. Transcript
**Location:** Inside the `async def run(ctx: JobContext, spec: SessionSpec) -> None:` function.

```python
    # --- LIVE TRANSCRIPT CAPTURE (livekit-agents >= 1.5.x) ---

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(ev):
        # Only capture final (non-partial) transcriptions
        if not getattr(ev, "is_final", True):
            return
        text = getattr(ev, "transcript", "") or ""
        if text.strip():
            _rsid = ctx.room.name.replace("interview-", "", 1)
            _redis_rpush(f"session:{_rsid}:transcript", {"role": "user", "text": text.strip(), "ts": round(time.time() * 1000)})
            _redis_expire(f"session:{_rsid}:transcript")
            logger.info("[TRANSCRIPT] User: %s", text.strip()[:80])

    @session.on("conversation_item_added")
    def on_conversation_item_added(ev):
        item = getattr(ev, "item", None)
        if item is None:
            return
        role = getattr(item, "role", "")
        # Only capture agent (assistant) speech turns
        if role != "assistant":
            return
        content = getattr(item, "content", "") or ""
        if isinstance(content, list):
            text = " ".join(
                c.text if hasattr(c, "text") else str(c)
                for c in content if c
            ).strip()
        else:
            text = str(content).strip()
        if text:
            _rsid = ctx.room.name.replace("interview-", "", 1)
            # Use the timestamp captured when user entered LISTENING (= agent started speaking).
            # This correctly places the agent turn BEFORE any subsequent user barge-in.
            ts = _agent_speech_start_ts[0] or (round(time.time() * 1000) - 2000)
            _agent_speech_start_ts[0] = None  # Reset for the next agent turn
            _redis_rpush(f"session:{_rsid}:transcript", {"role": "agent", "text": text, "ts": ts})
            _redis_expire(f"session:{_rsid}:transcript")
            logger.info("[TRANSCRIPT] Agent: %s", text[:80])
```

## 7. Tool Call
**Location:** Inside the `async def run(ctx: JobContext, spec: SessionSpec) -> None:` function.

```python
    # --- TOOL CALL TIMELINE ---
    @session.on("function_tools_executed")
    def on_function_tools_executed(ev):
        ts = round(time.time() * 1000)
        for call, output in ev.zipped():
            name = getattr(call, "name", None) or getattr(call, "function_name", "unknown")
            args = getattr(call, "arguments", {})
            result = getattr(output, "output", None) if output else None
            entry = {
                "turn_index": _turn_index[0] + 1,
                "timestamp_ms": ts,
                "tool_name": name,
                "arguments": args if isinstance(args, dict) else str(args),
                "result": str(result)[:300] if result else None,
            }
            _rsid = ctx.room.name.replace("interview-", "", 1)
            _redis_rpush(f"session:{_rsid}:tools", entry)
            _redis_expire(f"session:{_rsid}:tools")
            logger.info("TOOL CALL -> %s at turn %d", name, _turn_index[0] + 1)
```

## 8. Final POST
**Location:** Inside the `async def run(ctx: JobContext, spec: SessionSpec) -> None:` function.

> [!IMPORTANT]
> **Important Notes for Deployment:**
> - **Localhost URL:** The URL is currently hardcoded to `http://localhost:3000/api/audit/evaluates` for local testing. **You MUST change this to your deployed dashboard URL** when moving to production.
> - **Timeout:** The `timeout=30.0` is intentionally set to 30 seconds because the Audit Dashboard endpoint has to fetch data from Redis, merge transcripts, insert into Supabase, and queue the background worker. This can take a few seconds, so a longer timeout ensures the agent doesn't abruptly drop the connection before the dashboard acknowledges the request.

```python
    # --- SESSION END: PUSH FINAL TELEMETRY TO /api/audit/evaluate ---
    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant, *args, **kwargs):
        # Guard: only fire for the HUMAN/CANDIDATE participant, not the agent itself
        p_kind = getattr(participant, "kind", None)
        p_identity = getattr(participant, "identity", "") or ""
        if p_kind == 2 or str(p_kind) == "AGENT" or "agent" in p_identity.lower():
            logger.info("[evaluate] Agent participant disconnected - skipping POST.")
            return
        if _post_sent[0]:
            logger.info("[evaluate] participant_disconnected fired again - skipping duplicate POST.")
            return
        _post_sent[0] = True

        import time as _time
        _time.sleep(2)

        try:
            _rsid = ctx.room.name.replace("interview-", "", 1)

            # Calculate final average telemetry from the turn-by-turn data collected live
            def avg(lst): return round(sum(lst) / len(lst)) if lst else None
            stt = avg(_stt_ms) or 0
            llm = avg(_llm_ms)
            tts = avg(_tts_ms)

            logger.info(f"TELEMETRY -> STT={stt}ms | LLM_TTFT={llm}ms | TTS={tts}ms")

            payload = {
                "sessionId": _rsid,
                "sessionType": spec.session_mode or "guided",
                "telemetryDump": {
                    "stt_latency": stt,
                    "server_llm_ttft": llm,
                    "tts_latency": tts,
                    "bargeIns": _barge_ins[0],
                    "durationSeconds": int(time.time() - _session_start_time),
                    "candidateName": candidate_name or "Unknown",
                    "jobRole": job_title or "Unknown",
                    "organisation": getattr(spec, "organisation", None) or "Xobin",
                },
            }

            # NOTE: Change http://localhost:3000 to your deployed production URL
            req = urllib.request.Request(
                "http://localhost:3000/api/audit/evaluates",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            # NOTE: timeout=30.0 gives the dashboard enough time to process and save data to Supabase
            with urllib.request.urlopen(req, timeout=30.0) as resp:
                status = resp.status
                resp_body = resp.read().decode("utf-8")
            logger.info(f"AUDIT POST SENT (Status Code: {status}) | response: {resp_body[:300]}")
        except Exception as e:
            logger.error(f"AUDIT POST FAILED: {e}")
```
