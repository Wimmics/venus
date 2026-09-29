# Data Fields

The `field` property allows to select which data key drives a mark, visual channel or attribute.

```json
{
  	"nodes": {
    	"color": { "field": "speciesLabel" },
    	"size": { "field": "articleCount" }
  	},
  	"links": {
    	"color": { "field": "type" }
  	}
}

{
  	"x": { "field": "country" },
  	"y": { "field": "languageCount" },
  	"color": { "field": "language" }
}
```

**Notes**

- Prefer stable, non-null fields for color categories.
- For quantitative channels (size), ensure field values are numeric.
- When values are sparse, set fallback `value` on the channel.