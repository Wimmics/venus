# Label

The `label` property defines explicit label text for a mark.
It can be a constant string or a field reference.

```js
encoding: {
  nodes: {
    label: { field: "personName" }
  }
}
```

```js
encoding: {
  bars: {
    label: "Result"
  }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `label` | `string` | Constant label text for the mark. Possible values: any string. <br>**Default:** not set. |
| `label.field` | `string` | Data field used as the label text for each mark. Possible values: any field present for that mark. <br>**Default:** the mark field value when a rendered mark label needs text. |

## Usage

`label` is mark-level. Use it on the mark you want to label:

```js
encoding: {
  nodes: {
    source: {
      field: "person",
      label: { field: "personName" }
    },
    target: {
      field: "organization"
    }
  },
  links: {
    type: "directional",
    label: "works with"
  }
}
```

VENUS does not guess labels from other SPARQL variables. When `label` is omitted,
the mark uses the value of its own field where label text is needed.

The singular `label` property chooses text. The plural [`labels`](./labels.md)
property controls label display for marks that render visible labels.
