{
  description = "A very basic flake";

  inputs = { flake-utils.url = "github:numtide/flake-utils"; };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem [
      "aarch64-darwin"
      "x86_64-darwin"
      "x86_64-linux"
    ] (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShell = with pkgs;
          mkShell {
            nativeBuildInputs = [ pkg-config ];
            buildInputs = [
              coreutils
              nodejs
              yarn

              autoreconfHook
              xorg.libX11
              xorg.libXi
              xorg.libXext
              libGLU
              zlib
              glibc.out
              glibc.static
              libpng
              nasm
              cairo
              pango
              libuuid
            ];
            LD_LIBRARY_PATH = lib.makeLibraryPath [ libuuid ];
          };
      });
}
