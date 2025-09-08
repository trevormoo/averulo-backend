// lib/validate.js
import { ZodError } from "zod";

/**
 * validate(schema, source='body')
 * Usage: router.post("/", auth(true), validate(schema), handler)
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema ? schema.parse(req[source]) : req[source];
      req.validated = req.validated || {};
      req.validated[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          issues: err.issues,
        });
      }
      return res.status(400).json({ error: err.message || String(err) });
    }
  };
}