/**
 * Get a time-based greeting message
 * @returns {string} Greeting string (e.g., "Good Morning", "Good Afternoon", "Good Evening")
 */
export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'Good Morning ☀️';
  } else if (hour < 17) {
    return 'Good Afternoon 🌤️';
  } else {
    return 'Good Evening 🌙';
  }
};
