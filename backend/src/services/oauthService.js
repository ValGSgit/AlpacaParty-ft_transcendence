/**
 * OAuth Service — Google & GitHub login
 * @owner ValGSgit
 *
 * Uses passport-google-oauth20 and passport-github2.
 * Passport is initialized in index.js.
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import config from '../config/index.js';
import User from '../models/User.js';
import AuthService from './authService.js';
import GamificationService from './GamificationService.js';

/**
 * Reduce a raw provider profile name to the username character class our
 * validator accepts ([A-Za-z0-9_-]). Without this an OAuth user with a
 * unicode/punctuation display name ends up with a username they can never
 * later edit (PUT /api/users/me would fail validation).
 */
function sanitizeUsername(raw, provider, providerId) {
  const cleaned = String(raw || '')
    .normalize('NFKD')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 28)
    .toLowerCase();
  if (cleaned.length >= 3) return cleaned;
  return `${provider}_${String(providerId).slice(0, 12)}`;
}

export function initializePassport() {
  // ── Serialize / deserialize (for session-less JWT flows we only need id) ──
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // ── Google ────────────────────────────────────────────────
  if (config.oauth.google.clientId && !config.oauth.google.clientSecret) {
    console.warn('[oauth] Google client configured without client secret; strategy disabled');
  }

  if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
    console.info(`[oauth] Google strategy enabled (callback: ${config.oauth.google.callbackUrl})`);
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.oauth.google.clientId,
          clientSecret: config.oauth.google.clientSecret,
          callbackURL: config.oauth.google.callbackUrl,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const emailVerified = !!profile.emails?.[0]?.verified;
            const avatar = profile.photos?.[0]?.value;
            let username = sanitizeUsername(
              profile.displayName,
              'google',
              profile.id,
            );

            // Ensure username uniqueness
            const existing = await User.findByUsername(username);
            if (existing && existing.userAuth?.oauthId !== profile.id) {
              username = `${username}_${String(profile.id).slice(0, 4)}`;
            }

            const { user, created } = await User.findOrCreateOAuth({
              provider: 'google',
              oauthId: profile.id,
              username,
              email,
              avatar,
              emailVerified,
            });

            if (created) {
              GamificationService.onLogin(user.id).catch(() => {});
            }

            done(null, user);
          } catch (err) {
            done(err);
          }
        },
      ),
    );
  }

  // ── GitHub ────────────────────────────────────────────────
  if (config.oauth.github.clientId && !config.oauth.github.clientSecret) {
    console.warn('[oauth] GitHub client configured without client secret; strategy disabled');
  }

  if (config.oauth.github.clientId && config.oauth.github.clientSecret) {
    console.info(`[oauth] GitHub strategy enabled (callback: ${config.oauth.github.callbackUrl})`);
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.oauth.github.clientId,
          clientSecret: config.oauth.github.clientSecret,
          callbackURL: config.oauth.github.callbackUrl,
          scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || null;
            // GitHub's primary email is always verified (no flag exposed,
            // but the API only returns verified primary emails for the
            // user:email scope).
            const emailVerified = !!email;
            const avatar = profile.photos?.[0]?.value;
            let username = sanitizeUsername(
              profile.username || profile.displayName,
              'github',
              profile.id,
            );

            const existing = await User.findByUsername(username);
            if (existing && existing.userAuth?.oauthId !== String(profile.id)) {
              username = `${username}_${String(profile.id).slice(0, 4)}`;
            }

            const { user, created } = await User.findOrCreateOAuth({
              provider: 'github',
              oauthId: String(profile.id),
              username,
              email,
              avatar,
              emailVerified,
            });

            if (created) {
              GamificationService.onLogin(user.id).catch(() => {});
            }

            done(null, user);
          } catch (err) {
            done(err);
          }
        },
      ),
    );
  }

  return passport;
}

/**
 * Generate JWT tokens for a user after successful OAuth.
 */
export function oauthTokensForUser(user) {
  const accessToken = AuthService.generateAccessToken(user);
  const refreshToken = AuthService.generateRefreshToken(user);
  return { accessToken, refreshToken, user };
}

export default { initializePassport, oauthTokensForUser };
