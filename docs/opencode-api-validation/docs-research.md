# OpenCode API Documentation Research

This note records the documented API assumptions used by the plugin adapter tests.

## Findings

- Plugin package installation is represented as `opencode plugin <module>` in user-facing documentation.
- The supported integration path for this project is tool exposure from the OpenCode plugin module.
- Legacy adapter assumptions such as command registration, direct notifications, or in-process restarts are treated as unsupported unless verified again.

## Maintenance

Update this file and `evidence-matrix.json` together when OpenCode documentation or runtime behavior changes.
