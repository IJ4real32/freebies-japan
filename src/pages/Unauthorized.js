export default function Unauthorized() {
  return (
    <div className="p-8 text-center text-red-600">
      <h1 className="text-2xl font-bold mb-4">🚫 Access Denied</h1>
      <p className="mb-2">You do not have permission to view this page.</p>
      <p className="text-sm">Please log in with the appropriate credentials or contact an administrator if you believe this is an error.</p>
    </div>
  );
}
