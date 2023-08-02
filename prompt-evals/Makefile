.PHNEY: run-and-format run format install

run-and-format: run format

run:
	@if [ "${OPENAI_API_KEY}" = "" ]; then echo "Please set OPENAI_API_KEY."; exit 1; fi
	@if [ ! -f .venv/bin/oaieval ]; then echo "Please run make install first."; fi
	.venv/bin/oaieval --registry_path . --record_path log.jsonl gpt-3.5-turbo super-translator

format:
	jq --slurp '[[.[] | select(.type == "match")] | sort_by(.sample_id) | .[].data]' log.jsonl | tee result.json

install:
	python -m venv .venv
	.venv/bin/pip install evals
