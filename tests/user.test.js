const request = require("supertest");
const app = require("../src/server");
const User = require("../src/models/User");
const Event = require("../src/models/Event");

describe("User Routes", () => {
  let accessToken;

  it("should register a new user", async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "Test User",
      email: "testuser@example.com",
      phone: "1234567890",
      password: "Password123!",
      initialRole: "buyer",
    });
    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toContain("enregistré");
  });

  it("should login the user successfully", async () => {
    const res = await request(app).post("/api/users/login").send({
      emailOrPhone: "testuser@example.com",
      password: "Password123!",
      role: "buyer",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("accessToken");
    accessToken = res.body.accessToken;
  });

  it("should fail to login with wrong password", async () => {
    const res = await request(app).post("/api/users/login").send({
      emailOrPhone: "testuser@example.com",
      password: "WrongPassword123!",
      role: "buyer",
    });
    expect(res.statusCode).toEqual(400);
  });

  it("should update the user", async () => {
    const res = await request(app)
      .put("/api/users/update/123")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated Name" });
    expect(res.statusCode).toEqual(404); // Mocked ID
  });
});
