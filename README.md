# City Roads

Generate beautiful road map images for any city in the world, powered by OpenStreetMap data. Download your map as SVG or high-resolution PNG to use on print-on-demand services like Zazzle.

## Project Structure

```
city-roads-app/       # React + Vite frontend
city-roads-backend/   # Node.js + Express backend (Overpass API proxy)
```

## Getting Started

### 1. Start the backend

```bash
cd city-roads-backend
npm install
npm start
```

The backend will run on **http://localhost:3001**.

### 2. Start the frontend

In a new terminal:

```bash
cd city-roads-app
npm install
npm run dev
```

The frontend will run on **http://localhost:5173**.

## How It Works

1. Enter a city name in the search box
2. The backend queries the [Overpass API](https://overpass-api.de/) (OpenStreetMap data) for all roads in that city
3. The frontend renders the roads as an SVG on a dark background
4. Download the result as SVG (scalable, best for printing) or PNG (2× resolution)

## Using Your Map on Products

1. Download the PNG file
2. Go to [Zazzle.com](https://www.zazzle.com)
3. Create an account, then go to **Sell → Create products**
4. Upload your PNG and place it on mugs, posters, t-shirts, and more

## Data Attribution

Road data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the [ODbL](https://opendatacommons.org/licenses/odbl/).
