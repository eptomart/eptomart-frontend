import { openSupportWhatsApp } from '../utils/whatsapp';
import toast from 'react-hot-toast';

/**
 * Floating WhatsApp support bubble — fixed bottom-right.
 * Drop into App.jsx once and it appears everywhere.
 */
const WhatsAppFloat = ({ message = 'Hi Eptomart! I need help.' }) => {
  const handleClick = () => {
    try {
      openSupportWhatsApp(message);
    } catch (err) {
      console.error('[WhatsAppFloat]', err);
      toast.error('Could not open WhatsApp. Please try manually.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Chat with Eptomart support on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:bg-[#1ebe5a] hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-green-300"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="w-7 h-7 text-white"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M16 2C8.28 2 2 8.28 2 16c0 2.44.65 4.73 1.78 6.72L2 30l7.47-1.74A13.93 13.93 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5a11.47 11.47 0 01-5.85-1.6l-.42-.25-4.43 1.03 1.06-4.32-.28-.44A11.46 11.46 0 014.5 16C4.5 9.6 9.6 4.5 16 4.5S27.5 9.6 27.5 16 22.4 27.5 16 27.5zm6.3-8.57c-.34-.17-2.02-1-2.34-1.11-.32-.11-.55-.17-.78.17s-.9 1.11-1.1 1.34-.4.26-.74.09c-.34-.17-1.44-.53-2.74-1.69a10.3 10.3 0 01-1.9-2.36c-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.67-.57-.58-.78-.59l-.67-.01c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.85s1.23 3.31 1.4 3.54c.17.23 2.42 3.7 5.87 5.19.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.83 2.31-1.62.28-.8.28-1.48.2-1.62-.09-.14-.32-.23-.67-.4z" />
      </svg>
    </button>
  );
};

export default WhatsAppFloat;
