# A POC prompt runner

Building applications on top of LLMs naively leads to fragile features. This attempts to provide an API for retrying and validating LLM outputs.

## Usage

```bash
OPENAI_API_KEY="<KEY>" npm run dev
```

## Things to try
In `index.ts`
* Try tweaking the validation rules to it fails.
* Try tweaking the retry count