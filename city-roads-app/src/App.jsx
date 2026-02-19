import { useState, useRef } from 'react';
import CitySearch from './components/CitySearch';
import MapCanvas from './components/MapCanvas';
import DownloadPanel from './components/DownloadPanel';
import './App.css';

function App() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cityName, setCityName] = useState('');
  const svgRef = useRef(null);

  const handleSearch = async (city) => {
    setLoading(true);
    setError('');
    setMapData(null);
    setCityName(city);

    try {
      const response = await fetch(
        `http://localhost:3001/api/city-roads?city=${encodeURIComponent(city)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      setMapData(data);
    } catch {
      setError('Could not connect to the server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>City Roads</h1>
        <p className="subtitle">Enter any city to generate a beautiful road map</p>
      </header>

      <main className="app-main">
        <CitySearch onSearch={handleSearch} loading={loading} />

        {error && (
          <div className="error-message">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="spinner" />
            <p>Fetching road data for <strong>{cityName}</strong>&hellip;</p>
            <p className="loading-note">This may take up to 30 seconds for large cities.</p>
          </div>
        )}

        {mapData && !loading && (
          <>
            <div className="map-wrapper">
              <MapCanvas data={mapData} svgRef={svgRef} />
            </div>
            <DownloadPanel svgRef={svgRef} cityName={mapData.city} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Road data &copy;{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{' '}
          contributors
        </p>
      </footer>
    </div>
  );
}

export default App;
