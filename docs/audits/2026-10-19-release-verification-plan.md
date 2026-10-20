# Release verification plan

1. Verify configured providers with minimal synthetic prompts, real embeddings, Brain retrieval, Ask and Compose persistence in an isolated test database. Repair confirmed code/configuration faults; distinguish provider credential/quota failures from application defects.
2. Extend CI to run the full live workspace regression suite and execute the production deployment smoke, retaining useful sanitized artifacts and cleaning up owned processes.
3. Unless a deployed staging URL is supplied, build and run a separate local production-like HTTPS stack with isolated test storage, throwaway signing/database credentials and a test-only certificate. Verify secure login/refresh, authenticated WebSockets, large backup round-trip, container restart and persisted data. Do not change public ingress, trust stores or existing services.
4. Run mobile layouts/keyboard navigation and accelerated Focus suspension/midnight/reload recovery. Record physical-device keyboard and actual sleep/resume checks separately; do not equate emulation with physical testing.
5. Re-run affected build/type/lint/unit/integration checks and release regression automation, record exact results and unresolved external prerequisites, and stop only owned services.
