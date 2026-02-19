import { useState } from 'react';
import './CitySearch.css';

function CitySearch({ onSearch, loading }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const examples = ['Paris', 'New York', 'Tokyo', 'London', 'Rome'];

  return (
    <div className="city-search">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          className="search-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a city name…"
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="search-button" disabled={loading || !input.trim()}>
          {loading ? 'Loading…' : 'Generate Map'}
        </button>
      </form>

      <div className="examples">
        <span className="examples-label">Try:</span>
        {examples.map((city) => (
          <button
            key={city}
            className="example-chip"
            onClick={() => {
              setInput(city);
              onSearch(city);
            }}
            disabled={loading}
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CitySearch;
