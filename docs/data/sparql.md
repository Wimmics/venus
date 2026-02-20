# SPARQL

VENUS expects a SPARQL `SELECT` query.

## Example

```sparql
SELECT ?person ?personLabel WHERE {
  ?person wdt:P31 wd:Q5 .

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en".
  }
}
LIMIT 20
````

## Specification

For full details on SPARQL syntax and semantics, refer to the official [W3C specification](https://www.w3.org/TR/sparql11-query/).