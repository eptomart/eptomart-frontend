import { useState } from 'react';
import toast from 'react-hot-toast';
import { openSupportWhatsApp } from '../utils/whatsapp';

/**
 * Floating WhatsApp support help button — fixed bottom-right.
 * Shows a headset/help icon with a tooltip label.
 * Sits below the draggable AI assistant (which defaults to 168px above bottom).
 */
const WhatsAppFloat = ({ message = 'Hi Eptomart! I need help with my order.' }) => {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    try {
      openSupportWhatsApp(message);
    } catch (err) {
      console.error('[WhatsAppFloat]', err);
      toast.error('Could not open WhatsApp. Please try manually.');
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-[9997] flex flex-col items-end gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip label */}
      {hovered && (
        <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
          💬 Chat Support
        </div>
      )}

      {/* Button */}
      <button
        type="button"
        onClick={handleClick}
        aria-label="Chat with Eptomart support on WhatsApp"
        title="Chat with Support on WhatsApp"
        className="w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:bg-[#1ebe5a] hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-green-300 relative"
      >
        {/* Help / headset icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7"
          aria-hidden="true"
        >
          {/* Headset shape */}
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
          <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>

        {/* Small WhatsApp dot badge */}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-[#25D366] flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-2.5 h-2.5" fill="#25D366">
            <path d="M16 2C8.28 2 2 8.28 2 16c0 2.44.65 4.73 1.78 6.72L2 30l7.47-1.74A13.93 13.93 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm6.3 19.93c-.34-.17-2.02-1-2.34-1.11-.32-.11-.55-.17-.78.17s-.9 1.11-1.1 1.34-.4.26-.74.09c-.34-.17-1.44-.53-2.74-1.69a10.3 10.3 0 01-1.9-2.36c-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.67-.57-.58-.78-.59l-.67-.01c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.85s1.23 3.31 1.4 3.54c.17.23 2.42 3.7 5.87 5.19.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.83 2.31-1.62.28-.8.28-1.48.2-1.62-.09-.14-.32-.23-.67-.4z" />
          </svg>
        </span>
      </button>
    </div>
  );
};

export default WhatsAppFloat;
