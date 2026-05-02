import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MANSALAY_DEFAULT = {
  lat: 12.5208,
  lng: 121.4381
};

const MapModal = ({ isOpen, onClose, onSave, initialPosition, saving = false }) => {
  const [position, setPosition] = useState(initialPosition || MANSALAY_DEFAULT);
  const [searchQuery, setSearchQuery] = useState('Mansalay, Oriental Mindoro');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearchError('');
    setPosition(initialPosition || MANSALAY_DEFAULT);
    setSearchQuery(initialPosition ? `${initialPosition.lat}, ${initialPosition.lng}` : 'Mansalay, Oriental Mindoro');
  }, [initialPosition, isOpen]);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([position.lat, position.lng], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    markerRef.current = L.marker([position.lat, position.lng]).addTo(map);

    map.on('click', (event) => {
      const next = { lat: event.latlng.lat, lng: event.latlng.lng };
      setPosition(next);
      if (markerRef.current) {
        markerRef.current.setLatLng(event.latlng);
      } else {
        markerRef.current = L.marker(event.latlng).addTo(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !isOpen) return;
    const latLng = L.latLng(position.lat, position.lng);
    markerRef.current.setLatLng(latLng);
    mapRef.current.setView(latLng, mapRef.current.getZoom());
  }, [position, isOpen]);

  const searchLocation = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchError('Enter a place to search.');
      return;
    }

    setSearching(true);
    setSearchError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error('Search failed');

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        setSearchError('No result found for that search.');
        return;
      }

      const next = {
        lat: Number(results[0].lat),
        lng: Number(results[0].lon)
      };

      if (Number.isNaN(next.lat) || Number.isNaN(next.lng)) {
        setSearchError('Could not parse location coordinates.');
        return;
      }

      setPosition(next);
      setSearchQuery(results[0].display_name || query);
      if (mapRef.current) {
        mapRef.current.setView([next.lat, next.lng], 15);
      }
    } catch (error) {
      setSearchError(error?.message || 'Location search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    searchLocation();
  };

  if (!isOpen) return null;

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <h3>Pin Resort Location</h3>
          <button className="map-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="map-modal-body">
          <p className="map-instruction">Tap on the map to pin your resort's exact location.</p>
          <p className="map-helper-text">Search, tap the map, then save your pinned location.</p>
          <form className="map-search-row" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="map-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search place (e.g. Mansalay, Oriental Mindoro)"
            />
            <button type="submit" className="map-search-btn" disabled={searching}>
              {searching ? '...' : 'Search'}
            </button>
          </form>
          {searchError ? <p className="map-search-error">{searchError}</p> : null}
          <div className="map-container-wrapper">
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="map-modal-footer">
          <div className="coords-display">
            <span>Lat: {position.lat.toFixed(6)}</span>
            <span>Lng: {position.lng.toFixed(6)}</span>
          </div>
          <button
            className="map-save-btn"
            onClick={() => onSave(position)}
            disabled={saving}
          >
            {saving ? 'Saving location...' : 'Save Pinned Location'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapModal;
