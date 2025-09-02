// File: src/pages/Home.jsx

export default function Home() {
  const images = [
    'https://tse2.mm.bing.net/th/id/OIP.kc5CDJHy72hi5SxHGpfyuAHaFM',
    'https://tse1.mm.bing.net/th/id/OIP.YsYpFW7z1N3WuAALoPjkHwHaHa',
    'https://tse1.mm.bing.net/th/id/OIP.XJ_OJzyitiv264HAH6HWFwHaHa'
  ];

  return (
    <div className="p-4">
      <div className="relative w-full overflow-hidden max-h-64 md:max-h-80 lg:max-h-[24rem] mb-6 rounded-md">
        <div className="flex animate-scroll-snap gap-4 w-max snap-x snap-mandatory overflow-x-auto">
          {images.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Community image ${idx + 1}`}
              className="w-full max-w-sm md:max-w-md lg:max-w-lg object-cover rounded snap-center"
            />
          ))}
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4">Welcome to Freebies Japan 🎒</h1>
      <p className="mb-4">This is a community-driven platform for sharing school and daily living supplies across Japan. Join us in giving unused items a second life.</p>
      <ul className="list-disc ml-6 text-sm">
        <li>🎁 Browse available free items</li>
        <li>📬 Request items as a member</li>
        <li>📦 Donate unused items to others</li>
        <li>🔒 Admins approve and manage donations and requests</li>
      </ul>
    </div>
  );
}
