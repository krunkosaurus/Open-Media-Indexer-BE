
# Open Media Indexer BE

**Open Media Indexer BE** is a Node.js-based backend utility that processes a local media collection (photos and videos) and produces a `.msgpack` file containing metadata (timestamps, locations, device info) for visualization with the [Open Media Indexer FE](https://github.com/krunkosaurus/Open-Media-Indexer-FE).

This backend tool extracts EXIF data from photos, location metadata from videos, performs local geo-resolution, normalizes data, and compresses the final results into a portable `.msgpack` file suitable for loading into the front-end UI.

**Note:** This tool does not upload your media anywhere. It runs locally and outputs a metadata file you can explore either locally (with the FE) or via a hosted instance at [OpenMediaIndexer.org](https://openmediaindexer.org/).

---

## Features

- **Metadata Extraction**: Gathers EXIF data (timestamps, camera info, GPS coordinates) from images and videos.
- **Local Geocoding**: Identifies the nearest city for each media location using a local city database (no external requests needed).
- **Geographical Augmentation**: Augments city names with state and country information using OpenStreetMap’s Nominatim service (optional, requires internet).
- **Data Normalization**: Consolidates and standardizes metadata into a uniform structure.
- **Efficient Export**: Outputs a `.msgpack` file, which is compact and easy to load into the [FE visualization tool](https://github.com/krunkosaurus/Open-Media-Indexer-FE).

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/)
- A directory containing your media files (e.g., photos and videos from a phone, camera, Meta Glasses, etc.). Supported formats include:
  - Images: `.jpg`, `.jpeg`, `.heic`, `.heif`, `.png`
  - Videos: `.mov`, `.mp4`

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/Open-Media-Indexer-BE.git
   cd Open-Media-Indexer-BE
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the environment**:
   - Copy the environment file:
     ```bash
     cp .env.example .env
     ```
   - Edit the `.env` file and set the `MEDIA_FOLDER` variable to the path of your media directory:
     ```env
     MEDIA_FOLDER='/Users/YourUserName/Dropbox/Camera Uploads'
     ```
     Replace `/Users/YourUserName/Dropbox/Camera Uploads` with your actual path.

4. **Indexing the metadata**:
   Run the following scripts **in order** to process the media and create the final `.msgpack` file:
   ```bash
   node 01_index.js
   node 02_local_geocode.js
   node 03_augment_locations.js
   node 04_normalize_data.js
   node 05_compress_to_msgpack.js
   ```

   Here’s what each step does:
   - `01_index.js`: Scans your media folder, extracts EXIF/metadata (timestamps, GPS).
   - `02_local_geocode.js`: Identifies nearest cities for each geolocated file using a local database.
   - `03_augment_locations.js`: (Optional) Augments city data with state/country using Nominatim (requires internet).
   - `04_normalize_data.js`: Consolidates metadata into a reduced, normalized data structure.
   - `05_compress_to_msgpack.js`: Compresses and encodes the final data into a `.msgpack` file.

5. **Locate the final output**:
   After these steps, the final `.msgpack` file will be located at:
   ```
   ./files/05_final_data.msgpack
   ```

---

## Using the `.msgpack` File

### With the Hosted Front-End

You can upload the `05_final_data.msgpack` file to the hosted example at [https://openmediaindexer.org/](https://openmediaindexer.org/) to instantly visualize your data timeline, map, and charts. No data is saved as this is purely a frontend client.

### Running the Front-End Locally

If you prefer to run the visualization UI locally:

1. Clone the Open Media Indexer FE repository:
   ```bash
   git clone https://github.com/krunkosaurus/Open-Media-Indexer-FE.git
   cd Open-Media-Indexer-FE
   npm install
   npm start
   ```
2. In the front-end UI, upload the `05_final_data.msgpack` file generated by the backend tool. You can now browse and analyze your media using filters, a time-based navigator, and an interactive map.

---

## File Structure

- **`01_index.js`**: Extracts metadata from your local media files.
- **`02_local_geocode.js`**: Finds the nearest cities for each geolocated item using a local database.
- **`03_augment_locations.js`**: Enhances location data (adds state/country) via Nominatim lookups.
- **`04_normalize_data.js`**: Normalizes and reduces the final dataset.
- **`05_compress_to_msgpack.js`**: Converts the finalized JSON dataset into a `.msgpack` file.
- **`./files`**: Stores intermediate and final data files.
- **`.env.example`**: Template for environment variables, including the `MEDIA_FOLDER` path.

---

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add new feature'
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request in the main repository.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [exifr](https://github.com/MikeKovarik/exifr) for EXIF parsing.
- [ffprobe](https://ffmpeg.org/ffprobe.html) via `exec` for video metadata extraction.
- [all-the-cities](https://github.com/zeke/all-the-cities) for local city data.
- [Nominatim](https://nominatim.openstreetmap.org/) from OpenStreetMap for optional location augmentation.
- Inspired by the need for an open, private, and user-controlled media indexing solution.

