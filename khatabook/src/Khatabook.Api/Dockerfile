# Stage 1: Runtime base image (.NET 10)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

# Stage 2: SDK build image (.NET 10)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Khatabook.Api.csproj", "./"]
RUN dotnet restore "Khatabook.Api.csproj"
COPY . .
RUN dotnet build "Khatabook.Api.csproj" -c Release -o /app/build

# Stage 3: Publish
FROM build AS publish
RUN dotnet publish "Khatabook.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 4: Production final image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Default container listening port
ENV ASPNETCORE_HTTP_PORTS=8080
ENTRYPOINT ["dotnet", "Khatabook.Api.dll"]
