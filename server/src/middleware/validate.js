export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.') || source,
          message: i.message,
        })),
      });
    }
    // WHY: req.query is a getter on Express 5 but writable on 4. Assign to a
    // separate property so this keeps working if the app is upgraded.
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
}
