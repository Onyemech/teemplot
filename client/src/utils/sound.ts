export const playNotificationSound = () => {
  const hasPlayedSound = sessionStorage.getItem('hasPlayedNotificationSound');

  if (!hasPlayedSound) {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(error => {
      console.error('Failed to play notification sound:', error);
    });
    sessionStorage.setItem('hasPlayedNotificationSound', 'true');
  }
};
