export default function SettingsPage() {
  return (
    <div className="max-w-xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="rounded-xl bg-card shadow p-6 border flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="w-full rounded border px-3 py-2" value="Alex Morgan" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input className="w-full rounded border px-3 py-2" value="alex.morgan@company.com" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Theme</label>
          <select className="w-full rounded border px-3 py-2">
            <option>System</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </div>
      </div>
    </div>
  )
} 