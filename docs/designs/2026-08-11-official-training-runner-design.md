# Unified Official Training Runner Design

## Goal

Restore `demo3.py` as the single official-model training entrypoint and make it support every architecture registered in `training_backbones.model_zoo`. The runner must also honor the existing transfer-learning request contract: strict state-dict loading, the selected freeze strategy, and the fine-tuning learning rate.

## Scope

The change will:

- add the missing `backend/models/training-models/demo3.py` entrypoint at the existing Unicode directory path;
- build official models through `build_forecaster` rather than legacy PredRNN-only classes;
- support both server-managed training datasets already exposed by the API;
- preserve the Ls sequence required by the optional SPHERE frontend;
- load transfer weights before optimizer creation;
- save a raw model `state_dict` compatible with `InferenceService._load_official_task_model`;
- retain the existing progress and metrics log format consumed by `TrainingService`.

This change will not modify uploaded-model training, freeze semantics, uploaded-weight validation, or the frontend.

## Chosen Approach

Implement a dedicated, import-safe official runner in `demo3.py`. It will import the official model registry and the existing transfer freeze strategy from the backend package. It will not copy or rename a legacy `demo3-*.py` script because those scripts only construct older PredRNN variants and silently ignore the current architecture and transfer arguments.

The module will expose the small API already required by repository tests:

- `prepare_training_tensors(...)`;
- `SpherePhaseWarpFrontEnd`;
- `get_model_input_dim(...)`;
- `main()`.

Importing the module must not parse process arguments or start training. Training starts only under the normal `if __name__ == "__main__"` guard.

## Data Flow

1. Parse normalized command-line hyperparameters produced by `build_hyperparameter_args`.
2. Load OpenMars plus MCD data, or the MCD overview dataset, from the configured server directories.
3. Normalize inputs using only the training portion and normalize the target with a scalar training mean and standard deviation.
4. Produce `x`, `ls`, and `y` sequences with shapes `[N, window, C, H, W]`, `[N, window]`, and `[N, horizon, 1, H, W]`.
5. Build the selected architecture with `build_forecaster`, including selected channels, architecture parameters, hidden dimensions, and SPHERE mode.
6. When transfer learning is enabled, load `ARESVISION_TRANSFER_WEIGHT_PATH` with `weights_only=True`, require strict state-dict compatibility, and apply the requested freeze strategy.
7. Construct Adam from trainable parameters only, using the fine-tuning learning rate when transfer learning is enabled.
8. Train and validate while emitting the existing epoch/loss log format.
9. Evaluate on the held-out split, emit the existing metrics labels, and save the final raw state dict to `--output_path`.

## Error Handling

The runner will fail before training when:

- an architecture is unknown;
- the selected dataset cannot produce enough samples;
- SPHERE receives an invalid Ls shape;
- transfer learning is enabled without a weight path;
- strict transfer loading finds missing, unexpected, or shape-mismatched parameters;
- the freeze strategy leaves no trainable parameters;
- a model returns a prediction shape different from the target.

These failures propagate to the subprocess exit code so `TrainingService` marks the task as failed and preserves the traceback in the task log.

## Testing

Development will follow red-green-refactor:

1. Run the existing entrypoint contract test and confirm it fails because `demo3.py` is absent.
2. Run the existing dataset-loader and SPHERE tests and confirm the same expected missing-entrypoint failure.
3. Add focused tests for official model construction and strict transfer loading, then confirm they fail before implementation.
4. Implement the smallest import-safe runner that satisfies those tests.
5. Run the official runner, model-zoo, training-channel, transfer-strategy, inference-contract, and frontend parameter tests.

No full dataset training job is required for automated verification; tensor-loader and one-batch model smoke tests provide bounded coverage of the runner contract.

## Acceptance Criteria

- `TrainingService.get_available_scripts()` returns `demo3.py` in a clean checkout.
- Every architecture exposed by `list_model_specs()` can be constructed through the official runner.
- The runner accepts task-derived and uploaded raw state dicts through the existing transfer source resolution.
- Strictly compatible weights are loaded before optimizer construction; incompatible weights fail the task.
- SPHERE models receive the matching Ls input sequence.
- Saved weights load through the current official inference path.
- Focused backend and frontend regression tests pass without new warnings.
