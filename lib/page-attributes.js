// Attribute definitions come from GET pages/attributes. Selections retain the existing PUT dictionary shape.
export function selectAttribute(definition, selected, attributes) {
  const next = { ...attributes, [definition.id]: selected };
  function removeChildren(nodes) {
    for (const node of nodes || []) {
      delete next[node.id];
      for (const value of node.values || []) removeChildren(value.attributes);
    }
  }
  for (const value of definition.values || []) {
    if (!selected.includes(value.id)) removeChildren(value.attributes);
  }
  return next;
}

export function validateAttributes(definitions, attributes) {
  for (const definition of definitions || []) {
    const selected = attributes[definition.id] || [];
    if (definition.isRequired && !selected.length) return `Choose a value for ${definition.name}.`;
    if (!definition.allowMultiSelection && selected.length > 1) return `Choose only one value for ${definition.name}.`;
    for (const value of definition.values || []) {
      if (selected.includes(value.id)) {
        const error = validateAttributes(value.attributes, attributes);
        if (error) return error;
      }
    }
  }
  return '';
}
