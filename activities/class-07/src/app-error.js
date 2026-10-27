// Typed application error, shared by every module since class 5: the auth
// module and the requests module both throw it, and the HTTP layer
// translates the category into a status code. Categories:
//   'contract'  -> 400  the client broke the request contract
//   'auth'      -> 401  no trustworthy identity (missing/invalid token, bad login)
//   'forbidden' -> 403  identified actor, operation not allowed
//   'resource'  -> 404  the resource does not exist (or must not be revealed)
//   'domain'    -> 409  conflict with the current state of the resource
export class AppError extends Error {
  constructor(category, code, message) {
    super(message);
    this.category = category;
    this.code = code;
  }
}
