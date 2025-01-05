docker build . --no-cache -t find4_io_backend_server_testnet
docker stop find4_io_backend_container_testnet
docker rm find4_io_backend_container_testnet
docker run --network=host --name find4_io_backend_container_testnet -p 49160:3001 -d find4_io_backend_server_testnet
