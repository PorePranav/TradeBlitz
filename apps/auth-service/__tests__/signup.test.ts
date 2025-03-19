import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

jest.mock('../src/utils/prisma', () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashedPassword123')),
}));

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '90';
process.env.JWT_COOKIE_EXPIRES_IN = '90';

describe('Auth Controller - Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should successfully create a new user and return a token', async () => {
    const mockUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword123',
      role: 'USER',
      avatar: 'https://example.com/avatar.png',
    };

    (prisma.user.create as jest.Mock).mockResolvedValueOnce(mockUser);

    const response = await request(app).post('/api/v1/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      avatar: 'https://example.com/avatar.png',
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveProperty('name', 'Test User');
    expect(response.body.data).toHaveProperty('email', 'test@example.com');
    expect(response.body.data).not.toHaveProperty('password');
    expect(response.headers['set-cookie']).toBeDefined();

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: 'USER',
        avatar: 'https://example.com/avatar.png',
      },
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
  });

  it('Should return 400 if passwords do not match', async () => {
    const response = await request(app).post('/api/v1/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'differentpassword',
      avatar: 'https://example.com/avatar.png',
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toBe('Passwords do not match');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('Should return 400 if email is invalid', async () => {
    const response = await request(app).post('/api/v1/auth/signup').send({
      name: 'Test User',
      email: 'invalid-email',
      password: 'password123',
      confirmPassword: 'password123',
      avatar: 'https://example.com/avatar.png',
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toContain('Invalid email address');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('Should return 400 if name is too short', async () => {
    const response = await request(app).post('/api/v1/auth/signup').send({
      name: 'A',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      avatar: 'https://example.com/avatar.png',
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toContain('Name should have at least 2 characters');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('Should return 400 if password is too short', async () => {
    const response = await request(app).post('/api/v1/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'short',
      confirmPassword: 'short',
      avatar: 'https://example.com/avatar.png',
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toContain('Password must be at least 8 characters long');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('Should create admin user when admin role is specified', async () => {
    const mockUser = {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashedPassword123',
      role: 'ADMIN',
      avatar: 'https://example.com/avatar.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      passwordChangedAt: null,
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    (prisma.user.create as jest.Mock).mockResolvedValueOnce(mockUser);

    const response = await request(app).post('/api/v1/auth/signup').send({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'adminpassword123',
      confirmPassword: 'adminpassword123',
      role: 'ADMIN',
      avatar: 'https://example.com/avatar.png',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('role', 'ADMIN');
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'ADMIN',
        }),
      })
    );
  });

  it('Should use default avatar if none is provided', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword123',
      role: 'USER',
      avatar:
        'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      passwordChangedAt: null,
      passwordResetToken: null,
      passwordResetExpires: null,
    };

    (prisma.user.create as jest.Mock).mockResolvedValueOnce(mockUser);

    const response = await request(app).post('/api/v1/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('avatar');
  });

  it('Should handle database errors gracefully', async () => {
    (prisma.user.create as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).post('/api/v1/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(response.status).toBe(500);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});
