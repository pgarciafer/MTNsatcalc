# Satellite Look Angle Calculator

A web-based tool to calculate the look angles (azimuth and elevation) to a geostationary satellite from a given location on Earth. It also visualizes blockage zones and satellite visibility on diagrams and an interactive map.

## Features

- **Look Angle Calculation**: Computes Azimuth, Elevation, and Relative Azimuth based on user location and satellite longitude.
- **Blockage Zone Visualization**: Add custom blockage zones and see their impact visualized on a vessel diagram and an elevation-longitude graph.
- **Visible Range**: Automatically calculates and displays the visible geostationary arc from your location.
- **Interactive Map**: Uses Leaflet to provide an interactive world map. Click anywhere on the map to set your coordinates.
- **Satellite Constellation Footprints**: Load a JSON file with satellite constellation data to visualize beam footprints on the map.
- **Satellite Lists**: Automatically categorizes visible satellites into "Unblocked" and "Blocked" lists based on your defined blockage zones.
- **Trim Calculation**: Helps calculate new trim values based on current and desired readings.
- **Export to PDF**: Generate a clean, printable PDF summary of the current calculations and diagrams.
- **Responsive Design**: Adapts to different screen sizes, from mobile to desktop.

## How to Use

1.  **Set Your Location**:
    - Manually enter your **Latitude** and **Longitude** in the input fields.
    - Alternatively, click the **"Get Location"** button to use your device's GPS.
    - You can also click directly on the interactive map to set your location.
2.  **Set Satellite & Heading**:
    - Enter the **Satellite's Longitude**.
    - Input your vessel's current **Heading**.
3.  **Add Blockage Zones**:
    - Click the **"Add Blockage Zone"** button.
    - For each zone, specify the **AZ Start**, **AZ Stop**, and the **EL Blockage** height. The diagrams will update to show the blocked areas.
4.  **Analyze Results**:
    - The calculated **AZ**, **EL**, and **REL** values are displayed.
    - The vessel diagram shows the relative look angle and blockage zones.
    - The elevation graph shows the satellite elevation across all longitudes, with blockage zones overlaid.
5.  **Use Constellation Data (Optional)**:
    - Click **"Choose File"** and select a valid satellite constellation `.json` file.
    - The map will populate with satellite beam footprints. Visible beams will be shown by default.
    - Use the map legend to toggle the visibility of specific beams.
    - The satellite lists will update to show all visible beams, sorted into unblocked and blocked categories. Click on any satellite in the list to select it for calculation.
