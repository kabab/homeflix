# Homeflix
Homeflix is a movie catalogue with a integrated torrent searching and streaming.

## Requirements
- Node.js: +22.12
- [TMDB](https://www.themoviedb.org/) API key
- (Optional) [Open Subtitles](https://www.opensubtitles.com/en/users/vip) VIP account

## Installation
Clone the repository, install the dependencies:
```bash
git clone https://github.com/kabab/homeflix
cd homeflix
npm install
```
Copy the `.env.example` file to `.env` and fill the required fields:
```bash
cp .env.example .env
```

`TMBD_API_KEY`: Your TMDB API key
`OPENSUBTITLES_API_KEY`: Your Open Subtitles API key
`OPENSUBTITLES_USERNAME`: Your Open Subtitles username
`OPENSUBTITLES_PASSWORD`: Your Open Subtitles password

## Usage

Run the application:
```bash
npm start
```
