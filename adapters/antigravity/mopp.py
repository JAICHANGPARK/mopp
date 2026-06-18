import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

# Attempt to import Antigravity SDK types, fail-safe to mocks if not available
try:
    from google.antigravity import types
    from google.antigravity.hooks import hooks
    HAS_SDK = True
except ImportError:
    class MockTypes:
        class ToolCall:
            def __init__(self, name: str, arguments: Dict[str, Any]):
                self.name = name
                self.arguments = arguments
        class HookResult:
            def __init__(self, allow: bool, reason: Optional[str] = None):
                self.allow = allow
                self.reason = reason
    types = MockTypes()
    hooks = None
    HAS_SDK = False

def resolve_mopp_bin() -> str:
    """Resolves the path to the MOPP core CLI binary."""
    # 1. Check MOPP_BIN environment variable
    if os.environ.get("MOPP_BIN"):
        return os.environ["MOPP_BIN"]
    
    # 2. Check local directories starting from current working directory
    cwd = Path.cwd()
    for parent in [cwd, *cwd.parents]:
        mopp_path = parent / "core" / "bin" / "mopp"
        if mopp_path.exists():
            return str(mopp_path)
            
    # 3. Check global gemini config plugins folder
    global_plugin_mopp = Path.home() / ".gemini" / "config" / "plugins" / "mopp" / "core" / "bin" / "mopp"
    if global_plugin_mopp.exists():
        return str(global_plugin_mopp)
        
    return "mopp"  # Fallback to system PATH

def mopp_gate(command: str) -> Dict[str, Any]:
    """Runs MOPP gate check on a shell command and returns the parsed JSON verdict."""
    mopp_bin = resolve_mopp_bin()
    try:
        # Run mopp gate command
        res = subprocess.run(
            ["node", mopp_bin, "gate", "--command", command, "--json"],
            capture_output=True,
            text=True
        )
        stdout = res.stdout.strip()
        if stdout:
            return json.loads(stdout)
    except Exception:
        # Fail open in case of execution errors to avoid blocking the agent
        pass
    
    return {
        "level": 0,
        "command": command,
        "verdict": {
            "action": "allow",
            "msg": "MOPP bypass/fail-open"
        }
    }

async def mopp_pre_tool_hook_impl(tool_call: Any) -> Any:
    """Google Antigravity SDK pre_tool_call_decide Hook.
    
    Intercepts shell commands ('run_command') and checks them against the active MOPP posture.
    """
    if tool_call.name != "run_command":
        return types.HookResult(allow=True)
        
    command_line = tool_call.arguments.get("CommandLine", "")
    if not command_line:
        return types.HookResult(allow=True)
        
    result = mopp_gate(command_line)
    verdict = result.get("verdict", {})
    action = verdict.get("action", "allow")
    msg = verdict.get("msg", "")
    level = result.get("level", 0)
    
    if action == "block":
        return types.HookResult(
            allow=False, 
            reason=f"[MOPP {level}] BLOCKED: {msg}"
        )
    elif action == "confirm":
        # Confirm acts as a 'deny' at hook level, prompting manual check
        return types.HookResult(
            allow=False,
            reason=f"[MOPP {level}] CONFIRMATION REQUIRED: {msg}. Please execute manually or adjust posture."
        )
        
    return types.HookResult(allow=True)

# Register hook using decorator if SDK is available
if HAS_SDK and hooks is not None:
    mopp_pre_tool_hook = hooks.pre_tool_call_decide(mopp_pre_tool_hook_impl)
else:
    mopp_pre_tool_hook = mopp_pre_tool_hook_impl
