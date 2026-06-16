import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BinderLayout } from "../components/layout/BinderLayout";
import { useProfile } from "../hooks/useProfile";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../api/endpoints/auth";
import { HttpError } from "../api/client";
import { TABS } from "../lib/tabs";
import { Button } from "../components/ui";

export default function SettingsPage() {
  const TAB = TABS.find(t => t.label === 'Settings')!
  const { state } = useAuth();
  const navigate = useNavigate();
  const { profile, isLoading, updateProfile, updatePreferences } = useProfile();

  const currentEmail =
    state.status === "authenticated" ? state.user.email : "";

  const [email, setEmail] = useState(currentEmail);
  const [displayName, setDisplayName] = useState("");
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('right')
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
    }
  }, [profile]);

  useEffect(() => {
    setEmail(currentEmail);
  }, [currentEmail]);

  async function handleAccountSave(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(false);
    setAccountSaving(true);
    try {
      await updateProfile({
        email: email !== currentEmail ? email : undefined,
        displayName: displayName || undefined,
      });
      setAccountSuccess(true);
    } catch (err) {
      setAccountError(err instanceof HttpError ? err.message : "Failed to save");
    } finally {
      setAccountSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof HttpError ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  const leftContent = (
    <div className="p-6 space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Account</h2>
        <form onSubmit={handleAccountSave} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Optional"
              className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
            />
          </div>
          {accountError && <p className="text-danger text-sm">{accountError}</p>}
          {accountSuccess && <p className="text-success text-sm">Saved</p>}
          <Button
            type="submit"
            variant="secondary"
            disabled={accountSaving || isLoading}
          >
            {accountSaving ? "Saving…" : "Save Account"}
          </Button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Security</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-muted"
            />
          </div>
          {passwordError && <p className="text-danger text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-success text-sm">Password changed</p>}
          <Button
            type="submit"
            variant="secondary"
            disabled={passwordSaving}
          >
            {passwordSaving ? "Changing…" : "Change Password"}
          </Button>
        </form>
      </section>

      {state.status === "authenticated" && state.user.isAdmin && (
        <section>
          <h2 className="text-lg font-semibold text-text mb-4">Admin</h2>
          <Button variant="secondary" onClick={() => navigate("/admin")}>
            Admin Panel
          </Button>
        </section>
      )}
    </div>
  );

  const rightContent = (
    <>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-text mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="text-sm text-text">Dark Mode</p>
              <p className="text-xs text-muted">Toggle the app theme</p>
              <p className="text-xs text-muted">Coming soon</p>

            </div>
            <button
              role="switch"
              aria-checked={profile?.preferences.darkMode ?? false}
              disabled
              onClick={() =>
                updatePreferences({ darkMode: !(profile?.preferences.darkMode ?? false) })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile?.preferences.darkMode ? "bg-accent" : "bg-surface-raised"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-off-white transition-transform ${profile?.preferences.darkMode ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="text-sm text-text">Notifications</p>
              <p className="text-xs text-muted">Coming soon</p>
            </div>
            <button
              role="switch"
              aria-checked={false}
              disabled
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-raised cursor-not-allowed"
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-off-white translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <BinderLayout
      barColor={TAB.color}
      activeTab="Settings"
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
}
