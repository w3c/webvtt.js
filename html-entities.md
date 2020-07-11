html-entities.json is based on https://html.spec.whatwg.org/entities.json
simplified to keep only characters values via:
`jq '.|with_entries(.value |= .characters)' entities.json > html-entities.json`