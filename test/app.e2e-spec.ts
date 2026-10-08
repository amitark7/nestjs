import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole, Users } from 'src/users/user.entity';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // THIS MUST EXIST
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /auth/register - should register a new user', async () => {
    const email = `e2e-${Date.now()}@example.com`;

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Test User',
        email,
        password: 'TestPassword123',
      })
      .expect(201);

    expect(response.body.password).toBeUndefined();
    expect(response.body.refreshTokenHash).toBeUndefined();
    expect(response.body.refreshTokenExpiresAt).toBeUndefined();
    expect(response.body).toBeDefined();
  });

  it('POST /auth/login - should login successfully', async () => {
    const email = `e2e-login-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Login User',
        email,
        password,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');

    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');

    expect(response.body.accessToken.length).toBeGreaterThan(0);
    expect(response.body.refreshToken.length).toBeGreaterThan(0);
  });

  it('GET /users/me - should return authenticated user', async () => {
    const email = `e2e-me-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Me User',
        email,
        password,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.password).toBeUndefined();
    expect(response.body.refreshTokenHash).toBeUndefined();
    expect(response.body.refreshTokenExpiresAt).toBeUndefined();

    expect(response.body).toBeDefined();
    expect(response.body.email).toBe(email);
    expect(response.body.name).toBe('E2E Me User');
  });

  it('POST /tasks - should create a task for authenticated user', async () => {
    const email = `e2e-task-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Task User',
        email,
        password,
      })
      .expect(201);

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    // Create task
    const response = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'E2E Test Task',
        description: 'Testing task creation through E2E',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2026-10-10T00:00:00.000Z',
      })
      .expect(201);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('task');

    expect(response.body.task).toHaveProperty('id');
    expect(response.body.task.title).toBe('E2E Test Task');
    expect(response.body.task.description).toBe(
      'Testing task creation through E2E',
    );
    expect(response.body.task.status).toBe('TODO');
    expect(response.body.task.priority).toBe('HIGH');
  });
  it('GET /tasks/:id - should prevent another user from accessing the task', async () => {
    const password = 'TestPassword123';

    // =========================
    // User A
    // =========================
    const userAEmail = `e2e-user-a-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'User A',
        email: userAEmail,
        password,
      })
      .expect(201);

    const userALogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userAEmail,
        password,
      })
      .expect(201);

    const userAToken = userALogin.body.accessToken;

    // =========================
    // User A creates task
    // =========================
    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'User A Private Task',
        description: 'This task belongs to User A',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2026-10-10T00:00:00.000Z',
      })
      .expect(201);

    const taskId = taskResponse.body.task.id;

    expect(taskId).toBeDefined();

    // =========================
    // User B
    // =========================
    const userBEmail = `e2e-user-b-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'User B',
        email: userBEmail,
        password,
      })
      .expect(201);

    const userBLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userBEmail,
        password,
      })
      .expect(201);

    const userBToken = userBLogin.body.accessToken;

    // =========================
    // User B tries to access
    // User A's task
    // =========================
    await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });

  it('PATCH /tasks/:id - should prevent another user from updating the task', async () => {
    const password = 'TestPassword123';

    // User A
    const userAEmail = `e2e-update-a-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Update User A',
        email: userAEmail,
        password,
      })
      .expect(201);

    const userALogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userAEmail,
        password,
      })
      .expect(201);

    const userAToken = userALogin.body.accessToken;

    // User A creates task
    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Private Update Task',
        description: 'User A owns this task',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2026-10-10T00:00:00.000Z',
      })
      .expect(201);

    const taskId = taskResponse.body.task.id;

    // User B
    const userBEmail = `e2e-update-b-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Update User B',
        email: userBEmail,
        password,
      })
      .expect(201);

    const userBLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userBEmail,
        password,
      })
      .expect(201);

    const userBToken = userBLogin.body.accessToken;

    // User B tries to update User A's task
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        title: 'Hacked Task',
      })
      .expect(404);
  });

  it('DELETE /tasks/:id - should prevent another user from deleting the task', async () => {
    const password = 'TestPassword123';

    // User A
    const userAEmail = `e2e-delete-a-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Delete User A',
        email: userAEmail,
        password,
      })
      .expect(201);

    const userALogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userAEmail,
        password,
      })
      .expect(201);

    const userAToken = userALogin.body.accessToken;

    // User A creates task
    const taskResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Private Delete Task',
        description: 'User A owns this task',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2026-10-10T00:00:00.000Z',
      })
      .expect(201);

    const taskId = taskResponse.body.task.id;

    // User B
    const userBEmail = `e2e-delete-b-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Delete User B',
        email: userBEmail,
        password,
      })
      .expect(201);

    const userBLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userBEmail,
        password,
      })
      .expect(201);

    const userBToken = userBLogin.body.accessToken;

    // User B tries to delete User A's task
    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });

  it('PUT /tasks/:id - should allow owner to update their own task', async () => {
    const email = `e2e-update-own-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Task Owner',
        email,
        password,
      })
      .expect(201);

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    // Create task
    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Original Task Title',
        description: 'Original description',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: '2026-10-10T00:00:00.000Z',
      })
      .expect(201);

    const taskId = createResponse.body.task.id;
    const version = createResponse.body.task.version;

    console.log('VERSION:', version);
    console.log('VERSION TYPE:', typeof version);

    // Owner updates their own task
    const updateResponse = await request(app.getHttpServer())
      .put(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Updated Task Title',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        version,
      });

    console.log(updateResponse.body.message);

    console.log(
      updateResponse.status,
      JSON.stringify(updateResponse.body, null, 2),
    );
    expect(updateResponse.status).toBe(200); // fails with the real status instead of a confusing undefined

    // expect(updateResponse.body).toBeDefined();

    // expect(updateResponse.body.task).toBeDefined();

    // expect(updateResponse.body.task.title).toBe('Updated Task Title');
    // expect(updateResponse.body.task.status).toBe('IN_PROGRESS');
    // expect(updateResponse.body.task.priority).toBe('HIGH');

    // expect(updateResponse.body.task.version).toBe(version + 1);
  });

  it('DELETE /tasks/:id - should allow owner to delete their own task', async () => {
    const email = `e2e-delete-own-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Delete Task Owner',
        email,
        password,
      })
      .expect(201);

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    // Create task
    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Task To Delete',
        description: 'This task will be deleted',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: '2026-10-10T00:00:00.000Z',
      })
      .expect(201);

    const taskId = createResponse.body.task.id;

    // Owner deletes their own task
    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Deleted task should no longer be accessible
    await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('POST /auth/refresh - should refresh access token successfully', async () => {
    const email = `e2e-refresh-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Refresh Token User',
        email,
        password,
      })
      .expect(201);

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const { accessToken, refreshToken } = loginResponse.body;

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // Refresh
    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken,
      })
      .expect(201);

    // Tokens should exist
    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).toBeDefined();

    // Refresh token must rotate
    expect(refreshResponse.body.refreshToken).not.toBe(refreshToken);
  });

  it('POST /auth/refresh - should reject reuse of old refresh token', async () => {
    const email = `e2e-refresh-reuse-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Refresh Reuse User',
        email,
        password,
      })
      .expect(201);

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const oldRefreshToken = loginResponse.body.refreshToken;

    expect(oldRefreshToken).toBeDefined();

    // First refresh → rotates the refresh token
    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: oldRefreshToken,
      })
      .expect(201);

    const newRefreshToken = refreshResponse.body.refreshToken;

    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(oldRefreshToken);

    // Try to reuse the old refresh token
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: oldRefreshToken,
      })
      .expect(401);
  });

  it('POST /auth/logout - should invalidate refresh token', async () => {
    const email = `e2e-logout-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Logout User',
        email,
        password,
      })
      .expect(201);

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;
    const refreshToken = loginResponse.body.refreshToken;

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // Logout
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    // Refresh should fail after logout
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken,
      })
      .expect(401);
  });

  it('POST /auth/login - should reject incorrect password', async () => {
    const email = `e2e-wrong-password-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Wrong Password User',
        email,
        password,
      })
      .expect(201);

    // Login with incorrect password
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'WrongPassword123',
      })
      .expect(401);
  });

  it('POST /auth/login - should reject non-existent email', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `does-not-exist-${Date.now()}@example.com`,
        password: 'TestPassword123',
      })
      .expect(401);
  });

  it('POST /auth/refresh - should reject invalid refresh token', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: 'this-is-not-a-valid-refresh-token',
      })
      .expect(401);
  });

  it('GET /users/me - should reject request without access token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('GET /users/me - should reject invalid access token', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer invalid.access.token')
      .expect(401);
  });

  it('POST /auth/logout - should reject request without access token', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
  });

  it('GET /users - should reject normal USER', async () => {
    const email = `e2e-user-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Normal E2E User',
        email,
        password,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('GET /users - should allow ADMIN', async () => {
    const email = `e2e-admin-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Admin',
        email,
        password,
      })
      .expect(201);

    // Promote user to ADMIN directly in the E2E database
    const userRepository = app.get(getRepositoryToken(Users));

    const user = await userRepository.findOne({
      where: { email },
    });

    expect(user).toBeDefined();

    user!.role = UserRole.ADMIN;
    await userRepository.save(user!);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toBeDefined();
  });

  it('POST /tasks - should reject unknown fields', async () => {
    const email = `e2e-validation-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Validation User',
        email,
        password,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Validation Test',
        description: 'Testing whitelist',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2026-10-10T00:00:00.000Z',

        // ❌ Not part of CreateTaskDto
        userId: 999999,
      })
      .expect(400);
  });

  it('POST /tasks - should reject invalid status', async () => {
    const email = `e2e-validation-${Date.now()}@example.com`;
    const password = 'TestPassword123';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Validation User',
        email,
        password,
      })
      .expect(201);

    // Login and get accessToken
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    // Now use the token
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Invalid Status',
        description: 'Testing enum validation',
        status: 'INVALID_STATUS',
        priority: 'HIGH',
        dueDate: '2026-10-10T00:00:00.000Z',
      })
      .expect(400);
  });

  it('POST /auth/register - should reject invalid email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Invalid User',
        email: 'not-an-email',
        password: 'TestPassword123',
      })
      .expect(400);
  });

  it('POST /auth/register - should reject weak password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Weak Password User',
        email: `weak-${Date.now()}@example.com`,
        password: 'password',
      })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
