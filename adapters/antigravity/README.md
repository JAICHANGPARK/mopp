# MOPP Protective Posture (Google Antigravity SDK)

This adapter enables integrating MOPP (Mission-Oriented Protective Posture) guardrails into autonomous agents built with the **Google Antigravity Python SDK**.

By hooking into the agent's turn lifecycle, MOPP will dynamically evaluate proposed shell commands (`run_command` calls) against the repository's active security posture.

---

## 1. Quick Setup

Import and register `mopp_pre_tool_hook` when configuring your agent:

```python
from google.antigravity import Agent, LocalAgentConfig
from adapters.antigravity.mopp import mopp_pre_tool_hook

config = LocalAgentConfig(
    system_instructions="You are a senior systems engineer.",
    hooks=[
        mopp_pre_tool_hook  # Hook to intercept tool calls
    ]
)

async with Agent(config) as agent:
    await agent.chat("Deploy the stack to staging.")
```

---

## 2. Advanced: Integrating with Custom Policies

If you want custom user prompts or fine-grained rule control, you can call `mopp_gate` manually or write a policy handler:

```python
from google.antigravity.hooks import policy
from adapters.antigravity.mopp import mopp_gate

async def mopp_approval_handler(tool_call):
    cmd = tool_call.arguments.get("CommandLine", "")
    result = mopp_gate(cmd)
    
    verdict = result["verdict"]["action"]
    msg = result["verdict"]["msg"]
    level = result["level"]
    
    if verdict == "block":
        print(f"🔴 MOPP {level} Blocked: {msg}")
        return False
    elif verdict == "confirm":
        # Interactively prompt user
        confirm = input(f"🟡 MOPP {level} Confirm: {msg}. Allow? [y/N] ")
        return confirm.lower() == 'y'
        
    return True

config = LocalAgentConfig(
    policies=[
        policy.ask_user("run_command", handler=mopp_approval_handler)
    ]
)
```

---

## 3. CLI Commands

You can still use the standard CLI to manage posture within the environment:

```bash
# Check current posture
node core/bin/mopp status

# Recommended posture based on threat signals
node core/bin/mopp assess

# Set new posture
node core/bin/mopp set 3 --reason "database migration"

# Step down posture when done
node core/bin/mopp down
```
