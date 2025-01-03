const jwt = require("jsonwebtoken");
const { verifyAccessToken } = require("../src/middleware/authMiddleware");

describe("Auth Middleware", () => {
  it("should pass valid token", (done) => {
    const token = jwt.sign({ id: "123" }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = () => done();

    verifyAccessToken(req, res, next);
  });

  it("should fail with missing token", () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    verifyAccessToken(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
