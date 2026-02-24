"""
Sequentially test each router import to find which one hangs or errors.
"""
import sys
import traceback

modules_to_test = [
    "app.core.database",
    "app.core.security",
    "app.core.agent_iam",
    "app.models.user",
    "app.models.resume",
    "app.models.job",
    "app.models.profile",
    "app.models.task_state",
    "app.utils.parsing",
    "app.routers.auth",
    "app.routers.cv",
    "app.routers.matcher",
    "app.routers.interview",
    "app.routers.agents",
    "app.orchestrator.app",
    "app.routers.pipeline",
]

for mod in modules_to_test:
    try:
        __import__(mod)
        print(f"  OK  {mod}")
        sys.stdout.flush()
    except Exception as e:
        print(f"  ERR {mod}: {e}")
        sys.stdout.flush()

print("\nDone.")
