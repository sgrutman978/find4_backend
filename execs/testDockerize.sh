docker build . -t test_speed_square_dapp_server
docker stop test_speed_square_dapp_server_container
docker rm test_speed_square_dapp_server_container
docker run --network=host --name test_speed_square_dapp_server_container -p 49160:3006 -d test_speed_square_dapp_server
