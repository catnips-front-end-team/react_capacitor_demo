import { render, screen } from '@testing-library/react';
import App from './App';

test('renders hardware demo title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Capacitor 硬件功能/i);
  expect(titleElement).toBeInTheDocument();
});
