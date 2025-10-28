# Contributing to Spreadsheet Template

Thank you for your interest in contributing to the Tambo Spreadsheet Template! We welcome contributions from the community.

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion for improvement:

1. Check the [existing issues](https://github.com/tambo-ai/spreadsheet-template/issues) to see if it's already been reported
2. If not, [open a new issue](https://github.com/tambo-ai/spreadsheet-template/issues/new) with a clear title and description
3. Include steps to reproduce the bug (if applicable)
4. Add relevant labels (bug, enhancement, documentation, etc.)

### Submitting Pull Requests

We love pull requests! Here's how to submit one:

1. **Fork the repository** and create your branch from `main`
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Follow the existing code style and conventions
   - Add comments for complex logic
   - Update documentation if needed

3. **Test your changes**
   - Run `npm run dev` to test locally
   - Run `npm run build` to ensure it builds successfully
   - Run `npm run lint` to check for linting errors

4. **Commit your changes**
   - Use clear and descriptive commit messages
   - Reference issue numbers if applicable (e.g., "Fix #123: Update spreadsheet rendering")

5. **Push to your fork**
   ```bash
   git push origin feature/my-new-feature
   ```

6. **Open a Pull Request**
   - Provide a clear description of the changes
   - Link to any related issues
   - Add screenshots or videos if applicable (especially for UI changes)

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing naming conventions
- Use meaningful variable and function names
- Keep functions small and focused on a single task

### Component Guidelines

When creating new Tambo components:

- Define a clear Zod schema for props validation
- Add comprehensive description for AI usage
- Include TypeScript types for all props
- Test with various AI prompts to ensure it works as expected

### File Organization

- Place Tambo components in `src/components/tambo/`
- Place UI components in `src/components/ui/`
- Place utility functions in `src/lib/`
- Place AI tools in `src/tools/`

### Testing

- Test your changes thoroughly in the browser
- Try various AI prompts to ensure components render correctly
- Check both desktop and mobile views
- Verify that state management works as expected

## What We're Looking For

We're especially interested in contributions that:

- Add new component types (visualizations, forms, etc.)
- Improve spreadsheet functionality (formulas, formatting, etc.)
- Enhance the user experience (keyboard shortcuts, undo/redo, etc.)
- Add new AI tools for data manipulation
- Improve documentation and examples
- Fix bugs and performance issues

## Code Review Process

1. A maintainer will review your PR within a few days
2. They may request changes or ask questions
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release!

## Questions?

If you have questions about contributing:

- Open an issue with the "question" label
- Join the [Tambo Discord community](https://discord.gg/tambo)
- Check the [Tambo documentation](https://tambo.co/docs)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions help make this template better for everyone. We appreciate your time and effort!
