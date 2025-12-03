# Google Cloud OpenTofu Configuration

This is the base OpenTofu configuration for managing infrastructure in your Google Cloud project.

## Prerequisites

1. [OpenTofu](https://opentofu.org/docs/intro/install/) installed (>= 1.6)
2. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
3. Authenticated with GCP: `gcloud auth application-default login`
4. Appropriate permissions to manage resources in your GCP project

## Setup

1. Initialize OpenTofu:
   ```bash
   tofu init
   ```

2. Review the planned changes:
   ```bash
   tofu plan
   ```

3. Apply the configuration:
   ```bash
   tofu apply
   ```

## Project Structure

- `provider.tf` - OpenTofu and Google Cloud provider configuration
- `variables.tf` - Input variable definitions
- `main.tf` - Main infrastructure resources
- `terraform.tfvars` - Variable values (gitignored)

## Adding Resources

Add your GCP resources to `main.tf`. For examples, see the [Google Cloud Provider documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs).

## Testing Camera Stream

The `test_stream_camera` script allows you to test streaming from your Mac's camera to the RTMP server.

### Prerequisites

- ffmpeg installed: `brew install ffmpeg`
- RTMP server running (deployed via this OpenTofu configuration)

### Usage

```bash
./test_stream_camera [stream_key]
```

- `stream_key` (optional): A unique identifier for your stream. Defaults to "test" if not provided.

### Example

```bash
# Stream with default key "test"
./test_stream_camera

# Stream with custom key "camera1"
./test_stream_camera camera1
```

### Viewing the Stream

Once streaming, watch the feed at:
```
http://magicarp.krithikrao.com/hls/[stream_key].m3u8
```

Replace `[stream_key]` with your stream key (e.g., `test` or `camera1`).

You can view this URL in:
- VLC Media Player
- OBS Studio (as a Media Source)
- Any HLS-compatible video player

Press `Ctrl+C` to stop streaming.

