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

