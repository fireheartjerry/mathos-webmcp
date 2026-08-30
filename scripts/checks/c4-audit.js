const tools = await document.modelContext.getTools()
const rows = tools.map(t => {
  let s = t.inputSchema
  if (typeof s === 'string') { try { s = JSON.parse(s) } catch { s = null } }
  const props = s?.properties ?? {}
  const fields = Object.entries(props).map(([k, v]) => ({
    k, type: v.type ?? null,
    bounded: v.type === 'string' ? (v.maxLength != null || v.enum != null)
           : v.type === 'number' || v.type === 'integer' ? (v.minimum != null || v.maximum != null)
           : true,
    described: typeof v.description === 'string' && v.description.length > 0,
  }))
  const d = t.description ?? ''
  return {
    name: t.name,
    nameOk: /^[a-z][a-z0-9_]*$/.test(t.name),
    schemaWasString: typeof t.inputSchema === 'string',
    fields: fields.length,
    untyped: fields.filter(f => !f.type).map(f => f.k),
    unbounded: fields.filter(f => !f.bounded).map(f => f.k),
    undescribed: fields.filter(f => !f.described).map(f => f.k),
    required: s?.required ?? [],
    descLen: d.length,
    hasNegativeClause: /\b(do not|don't|never|only when|not when|avoid|instead of|unless)\b/i.test(d),
  }
})
return {
  totals: {
    tools: rows.length,
    untyped: rows.reduce((a, r) => a + r.untyped.length, 0),
    unbounded: rows.reduce((a, r) => a + r.unbounded.length, 0),
    undescribed: rows.reduce((a, r) => a + r.undescribed.length, 0),
    missingNegativeClause: rows.filter(r => !r.hasNegativeClause).length,
    badNames: rows.filter(r => !r.nameOk).length,
  },
  rows,
}
