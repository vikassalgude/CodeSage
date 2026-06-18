import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

/**
 * Register a new user.
 */
export async function register(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Email and password are required' } });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: { message: 'A user with this email already exists' } });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        plan: 'FREE' // use enum value
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    logger.info(`Auth: User registered successfully: ${email}`);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (error) {
    logger.error('Auth: Registration error:', error);
    next(error);
  }
}

/**
 * Log in an existing user.
 */
export async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: { message: 'Email and password are required' } });
  }

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    logger.info(`Auth: User logged in successfully: ${email}`);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (error) {
    logger.error('Auth: Login error:', error);
    next(error);
  }
}

/**
 * Get current user profile.
 */
export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      plan: user.plan,
      githubToken: user.githubToken ? 'configured' : null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update GitHub token for current user.
 */
export async function updateGithubToken(req, res, next) {
  const { githubToken } = req.body;

  if (!githubToken) {
    return res.status(400).json({ error: { message: 'githubToken is required' } });
  }

  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { githubToken }
    });

    logger.info(`Auth: GitHub token updated for user ID: ${req.user.id}`);
    return res.status(200).json({ message: 'GitHub token updated successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle login/registration using GitHub OAuth authorization code.
 */
export async function githubLogin(req, res, next) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: { message: 'Code is required' } });
  }

  const clientId = process.env.GITHUB_CLIENT_ID || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    logger.error('Auth: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not configured on the backend');
    return res.status(500).json({ error: { message: 'GitHub OAuth is not configured on this server.' } });
  }

  try {
    // 1. Exchange OAuth code for an access token
    // Exchange OAuth code for access token using URL‑encoded form (GitHub expects this format)
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code
    });
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      logger.error('Auth: GitHub OAuth token exchange failed:', tokenData.error_description || tokenData.error);
      return res.status(400).json({ error: { message: tokenData.error_description || tokenData.error } });
    }

    const githubToken = tokenData.access_token;
    if (!githubToken) {
      return res.status(400).json({ error: { message: 'Failed to retrieve access token from GitHub.' } });
    }

    // 2. Fetch GitHub User profile info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'CodeSage-App'
      }
    });

    if (!userResponse.ok) {
      const userErr = await userResponse.text();
      logger.error('Auth: GitHub user fetch failed:', userErr);
      return res.status(400).json({ error: { message: 'Failed to retrieve user profile from GitHub.' } });
    }

    const githubUser = await userResponse.json();

    // 3. Fetch user emails to get the primary verified email
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'CodeSage-App'
      }
    });

    let email = githubUser.email;

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      const primaryEmail = emails.find(e => e.primary && e.verified);
      if (primaryEmail) {
        email = primaryEmail.email;
      } else if (emails.length > 0) {
        email = emails[0].email;
      }
    }

    if (!email) {
      email = `${githubUser.login}@users.noreply.github.com`;
    }

    // 4. Find or create the user in the database
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { githubToken }
      });
      logger.info(`Auth: Existing user logged in via GitHub OAuth: ${email}`);
    } else {
      user = await prisma.user.create({
        data: {
          email,
          githubToken,
          plan: 'FREE' // use enum value
        }
      });
      logger.info(`Auth: New user registered via GitHub OAuth: ${email}`);
    }

    // 5. Generate local JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (error) {
    logger.error('Auth: GitHub login execution error:', error);
    next(error);
  }
}

/**
 * Return the public client ID of the GitHub OAuth Application.
 */
export function getGithubConfig(req, res, next) {
  return res.status(200).json({
    clientId: process.env.GITHUB_CLIENT_ID || ''
  });
}
