docker build . -t leaderboard_server
docker stop leaderboard_server_container
docker rm leaderboard_server_container
docker run --network=host --name leaderboard_server_container -p 49160:3008 -d leaderboard_server
