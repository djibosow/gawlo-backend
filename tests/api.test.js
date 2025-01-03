const request = require("supertest");
const app = require("../src/server");
const { disconnectDB } = require("../src/config/db");
const User = require("../src/models/User");
const Event = require("../src/models/Event");

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  await User.deleteMany({});
  await Event.deleteMany({});
});

afterAll(async () => {
  jest.restoreAllMocks();
  await disconnectDB();
});

describe("API Endpoints", () => {
  it("should return 404 for GET /api/users if route is invalid", async () => {
    const res = await request(app).get("/api/users");
    expect(res.statusCode).toEqual(404);
  });

  it("should return 404 for an unknown route", async () => {
    const res = await request(app).get("/unknown-route");
    expect(res.statusCode).toEqual(404);
  });

  it("should register a new user successfully", async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "Test User",
      email: "testuser@example.com",
      phone: "1234567890",
      password: "Password123!",
      initialRole: "buyer",
    });
    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toEqual("Utilisateur enregistré avec succès.");
  });

  it("should not register a user with an existing email", async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "Test User",
      email: "testuser@example.com",
      phone: "0987654321",
      password: "Password123!",
      initialRole: "buyer",
    });
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toContain("existe déjà");
  });

  it("should login a user successfully", async () => {
    const res = await request(app).post("/api/users/login").send({
      emailOrPhone: "testuser@example.com",
      password: "Password123!",
      role: "buyer",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
  });

  it("should fail to login with incorrect password", async () => {
    const res = await request(app).post("/api/users/login").send({
      emailOrPhone: "testuser@example.com",
      password: "WrongPassword123!",
      role: "buyer",
    });
    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toContain("invalide");
  });

  it("should fail to login if role is incorrect", async () => {
    const res = await request(app).post("/api/users/login").send({
      emailOrPhone: "testuser@example.com",
      password: "Password123!",
      role: "organizer",
    });
    expect(res.statusCode).toEqual(403);
    expect(res.body.message).toContain("n'est pas enregistré en tant que organizer");
  });

  it("should create a new event successfully", async () => {
    const loginRes = await request(app).post("/api/users/login").send({
      emailOrPhone: "testuser@example.com",
      password: "Password123!",
      role: "buyer",
    });
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Event",
        category: "Music",
        subcategory: "Concerts",
        description: "This is a test event",
        startDate: "2024-12-30T10:00:00.000Z",
        endDate: "2024-12-30T12:00:00.000Z",
        isFree: true,
        eventType: "Online",
        eventLink: "https://testevent.com",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("title", "Test Event");
  });

  it("should fail to create an event without authorization", async () => {
    const res = await request(app).post("/api/events").send({
      title: "Unauthorized Event",
      category: "Music",
      subcategory: "Concerts",
      description: "This should fail",
      startDate: "2024-12-30T10:00:00.000Z",
      endDate: "2024-12-30T12:00:00.000Z",
      isFree: true,
      eventType: "Online",
      eventLink: "https://unauthorized.com",
    });

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toContain("d'accès est requis");
  });
});
