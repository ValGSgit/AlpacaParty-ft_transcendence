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
import Achievement from '../models/Achievement.js';

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
  if (config.oauth.google.clientId) {
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
            const avatar = profile.photos?.[0]?.value;
            let username = profile.displayName?.replace(/\s+/g, '_').toLowerCase().slice(0, 28) || `google_${profile.id}`;

            // Ensure username uniqueness
            const existing = await User.findByUsername(username);
            if (existing && existing.oauth_id !== profile.id) {
              username = `${username}_${profile.id.slice(0, 4)}`;
            }

            const { user, created } = await User.findOrCreateOAuth({
              provider: 'google',
              oauthId: profile.id,
              username,
              email,
              avatar,
            });

            if (created) {
              await Achievement.unlock(user.id, 'first_login').catch(() => {});
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
  if (config.oauth.github.clientId) {
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
            const email = profile.emails?.[0]?.value || `github_${profile.id}@placeholder.com`;
            const avatar = profile.photos?.[0]?.value;
            let username = (profile.username || `github_${profile.id}`).slice(0, 28);

            const existing = await User.findByUsername(username);
            if (existing && existing.oauth_id !== String(profile.id)) {
              username = `${username}_${String(profile.id).slice(0, 4)}`;
            }

            const { user, created } = await User.findOrCreateOAuth({
              provider: 'github',
              oauthId: String(profile.id),
              username,
              email,
              avatar,
            });

            if (created) {
              await Achievement.unlock(user.id, 'first_login').catch(() => {});
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
