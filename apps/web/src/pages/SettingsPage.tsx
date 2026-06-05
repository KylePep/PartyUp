import { useState, useEffect } from "react";
import { BinderLayout } from "../components/layout/BinderLayout";
import { useProfile } from "../hooks/useProfile";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../api/endpoints/auth";
import { HttpError } from "../api/client";

export default function SettingsPage() {
  const { state } = useAuth();
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
        <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
        <form onSubmit={handleAccountSave} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Optional"
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          {accountError && <p className="text-red-400 text-sm">{accountError}</p>}
          {accountSuccess && <p className="text-green-400 text-sm">Saved</p>}
          <button
            type="submit"
            disabled={accountSaving || isLoading}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
          >
            {accountSaving ? "Saving…" : "Save Account"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-400 text-sm">Password changed</p>}
          <button
            type="submit"
            disabled={passwordSaving}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
          >
            {passwordSaving ? "Changing…" : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );

  const rightContent = (
    <>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Dark Mode</p>
              <p className="text-xs text-gray-400">Toggle the app theme</p>
            </div>
            <button
              role="switch"
              aria-checked={profile?.preferences.darkMode ?? false}
              onClick={() =>
                updatePreferences({ darkMode: !(profile?.preferences.darkMode ?? false) })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile?.preferences.darkMode ? "bg-blue-600" : "bg-gray-600"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile?.preferences.darkMode ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="text-sm text-white">Notifications</p>
              <p className="text-xs text-gray-400">Coming soon</p>
            </div>
            <button
              role="switch"
              aria-checked={false}
              disabled
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 cursor-not-allowed"
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <BinderLayout
      barColor="#be4fe3"
      activeTab="Settings"
      activeSide={activeSide}
      onToggleSide={() => setActiveSide(s => s === 'left' ? 'right' : 'left')}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
}
