# Drohnenverwaltung: Angular-Frontend und ASP.NET-Core-Backend in einem Container (REQ-032).
# Bauen und starten: docker compose up --build   ->   http://localhost:8080

# 1. Angular-App bauen
FROM node:26.8.2-alpine AS frontend
WORKDIR /src
COPY frontend/drone-inventory-ui/package.json frontend/drone-inventory-ui/package-lock.json ./
RUN npm ci
COPY frontend/drone-inventory-ui/ ./
RUN npx ng build

# 2. Backend veroeffentlichen
FROM mcr.microsoft.com/dotnet/sdk:10.0.402 AS backend
WORKDIR /src
COPY backend/DroneInventory.Api/DroneInventory.Api.csproj DroneInventory.Api/
RUN dotnet restore DroneInventory.Api/DroneInventory.Api.csproj
COPY backend/DroneInventory.Api/ DroneInventory.Api/
RUN dotnet publish DroneInventory.Api/DroneInventory.Api.csproj -c Release -o /app --no-restore

# 3. Laufzeit: nur das Backend mit der gebauten App in wwwroot
FROM mcr.microsoft.com/dotnet/aspnet:10.0.13
WORKDIR /app
COPY --from=backend /app ./
COPY --from=frontend /src/dist/drone-inventory-ui/browser ./wwwroot

# Die Datenbank liegt in /data, damit ein Volume sie ueber Neustarts und neue Images behaelt.
RUN mkdir /data && chown app:app /data
ENV ConnectionStrings__DroneInventory="Data Source=/data/droneinventory.db"
VOLUME /data

EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "DroneInventory.Api.dll"]