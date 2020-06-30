import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const findProducts = await this.productsRepository.findAllById(
      products.map(product => ({ id: product.id })),
    );

    if (findProducts.length !== products.length) {
      throw new AppError('Product does not exists');
    }

    products.forEach(product => {
      const findProductId = findProducts.find(
        findProduct => findProduct.id === product.id,
      );

      const quantityProductInDatabase = findProductId?.quantity || 0;

      if (quantityProductInDatabase < product.quantity) {
        throw new AppError('Invalid quantity');
      }
    });

    const order = this.ordersRepository.create({
      customer,
      products: products.map(product => ({
        product_id: product.id,
        price: findProducts.find(({ id }) => id === product.id)?.price || 0,
        quantity: product.quantity,
      })),
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
